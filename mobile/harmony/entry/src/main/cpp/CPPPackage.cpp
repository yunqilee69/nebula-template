#include "RNOH/PackageProvider.h"
#include "SafeAreaViewPackage.h"

using namespace rnoh;

std::vector<std::shared_ptr<Package>> PackageProvider::getPackages(Package::Context ctx) {
  return {
    std::make_shared<SafeAreaViewPackage>(ctx),
  };
}
