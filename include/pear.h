#ifndef PEAR_H
#define PEAR_H

#include <js.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <uv.h>

#include "pear/modules.h"
#include "pear/target.h"
#include "pear/version.h"

typedef struct pear_s pear_t;

typedef void (*pear_before_exit_cb)(pear_t *);
typedef void (*pear_exit_cb)(pear_t *);
typedef void (*pear_suspend_cb)(pear_t *);
typedef void (*pear_idle_cb)(pear_t *);
typedef void (*pear_resume_cb)(pear_t *);

struct pear_s {
  uv_loop_t *loop;
  js_platform_t *platform;
  js_env_t *env;
  uv_idle_t idle;
  bool suspended;

  pear_before_exit_cb on_before_exit;
  pear_exit_cb on_exit;
  pear_suspend_cb on_suspend;
  pear_idle_cb on_idle;
  pear_resume_cb on_resume;

  struct {
    js_value_t *exports;
    int argc;
    char **argv;
  } runtime;
};

int
pear_setup (uv_loop_t *loop, pear_t *pear, int argc, char **argv);

int
pear_teardown (pear_t *pear, int *exit_code);

int
pear_run (pear_t *pear, const char *filename, const uv_buf_t *source);

int
pear_suspend (pear_t *pear);

int
pear_resume (pear_t *pear);

int
pear_on_before_exit (pear_t *pear, pear_before_exit_cb cb);

int
pear_on_exit (pear_t *pear, pear_exit_cb cb);

int
pear_on_suspend (pear_t *pear, pear_suspend_cb cb);

int
pear_on_idle (pear_t *pear, pear_idle_cb cb);

int
pear_on_resume (pear_t *pear, pear_resume_cb cb);

int
pear_get_data (pear_t *pear, const char *key, js_value_t **result);

int
pear_get_data_external (pear_t *pear, const char *key, void **result);

int
pear_set_data (pear_t *pear, const char *key, js_value_t *value);

int
pear_set_data_external (pear_t *pear, const char *key, void *value);

#endif // PEAR_H
