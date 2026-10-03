// RN 0.77 移除了 ReactCommon/butter（butter::map 已不存在），
// 而 safe-area-context 鸿蒙适配包 4.7.4 的 codegen 产物 Props.h 仍按旧版生成
// `(butter::map<std::string, RawValue>)value`。RawValue 已内建
// unordered_map 的 castValue 重载，把 butter::map 别名到 std::unordered_map 即可复用。
// 该头经 -include 强制前置包含，需容忍 .S 汇编编译单元（无 C++ 标准库）。
#pragma once
#ifdef __cplusplus
#include <unordered_map>
namespace butter {
template <typename K, typename V, typename Hash = std::hash<K>, typename Eq = std::equal_to<K>>
using map = std::unordered_map<K, V, Hash, Eq>;
} // namespace butter
#endif
