#include <assert.h>
#include <js.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
#include <uv.h>

#include "../include/bare.h"
#include "runtime.h"
#include "types.h"

struct bare_s {
  bare_process_t process;

  bool exited;
};

int
bare_setup (uv_loop_t *loop, js_platform_t *platform, int argc, char **argv, const bare_options_t *options, bare_t **result) {
  int err;

  bare_t *bare = malloc(sizeof(bare_t));

  bare->exited = false;

  bare_process_t *process = &bare->process;

  process->platform = platform;
  process->argc = argc;
  process->argv = argv;

  process->threads = NULL;

  process->on_before_exit = NULL;
  process->on_exit = NULL;
  process->on_suspend = NULL;
  process->on_idle = NULL;
  process->on_resume = NULL;

  bare_runtime_t *runtime = &process->runtime;

  runtime->loop = loop;
  runtime->process = process;

  err = bare_runtime_setup(runtime);
  assert(err == 0);

  err = uv_rwlock_init(&process->locks.threads);
  assert(err == 0);

  *result = bare;

  return 0;
}

int
bare_teardown (bare_t *bare, int *exit_code) {
  int err;

  bare_process_t *process = &bare->process;

  bare_runtime_on_exit(&process->runtime, exit_code);

  err = bare_runtime_teardown(&process->runtime);
  assert(err == 0);

  uv_rwlock_destroy(&process->locks.threads);

  return 0;
}

int
bare_run (bare_t *bare, const char *filename, const uv_buf_t *source) {
  int err;

  bare_runtime_t *runtime = &bare->process.runtime;

  err = bare_runtime_run(runtime, filename, source);
  if (err < 0) return err;

  bare->exited = true;

  return 0;
}

int
bare_exit (bare_t *bare, int exit_code) {
  if (bare->exited) return -1;
  bare->exited = true;

  bare_runtime_t *runtime = &bare->process.runtime;

  bare_runtime_on_exit(runtime, exit_code == -1 ? &exit_code : NULL);

  exit(exit_code);

  return 0;
}

int
bare_suspend (bare_t *bare) {
  return uv_async_send(&bare->process.runtime.suspend);
}

int
bare_resume (bare_t *bare) {
  return uv_async_send(&bare->process.runtime.resume);
}

int
bare_on_before_exit (bare_t *bare, bare_before_exit_cb cb) {
  bare->process.on_before_exit = cb;

  return 0;
}

int
bare_on_exit (bare_t *bare, bare_exit_cb cb) {
  bare->process.on_exit = cb;

  return 0;
}

int
bare_on_suspend (bare_t *bare, bare_suspend_cb cb) {
  bare->process.on_suspend = cb;

  return 0;
}

int
bare_on_idle (bare_t *bare, bare_idle_cb cb) {
  bare->process.on_idle = cb;

  return 0;
}

int
bare_on_resume (bare_t *bare, bare_resume_cb cb) {
  bare->process.on_resume = cb;

  return 0;
}

int
bare_get_platform (bare_t *bare, js_platform_t **result) {
  *result = bare->process.platform;

  return 0;
}

int
bare_get_env (bare_t *bare, js_env_t **result) {
  *result = bare->process.runtime.env;

  return 0;
}
