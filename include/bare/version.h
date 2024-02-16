#ifndef BARE_VERSION_H
#define BARE_VERSION_H

#include "helper.h"

#define BARE_VERSION_MAJOR 1
#define BARE_VERSION_MINOR 0
#define BARE_VERSION_PATCH 1

#define BARE_VERSION BARE_STRING(BARE_VERSION_MAJOR) "." BARE_STRING(BARE_VERSION_MINOR) "." BARE_STRING(BARE_VERSION_PATCH)

#endif // BARE_VERSION_H
