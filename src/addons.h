#ifndef PEAR_ADDONS_H
#define PEAR_ADDONS_H

#include <js.h>
#include <uv.h>

#define PEAR_ADDONS_DYNAMIC 1
#define PEAR_ADDONS_STATIC  2
#define PEAR_ADDONS_RESOLVE 4

void
pear_addons_init ();

int
pear_addons_resolve (uv_loop_t *loop, const char *path, char *out);

js_value_t *
pear_addons_load (js_env_t *env, const char *path, int mode);

#endif // PEAR_ADDONS_H
