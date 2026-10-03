#include "SafeAreaStackNode.h"

#include <glog/logging.h>
#include <memory>
#include "RNOH/arkui/NativeNodeApi.h"
#include "SafeAreaManagerMap.h"

namespace rnoh {

SafeAreaStackNode::SafeAreaStackNode()
    : ArkUINode(NativeNodeApi::getInstance()->createNode(
          ArkUI_NodeType::ARKUI_NODE_STACK)),
      m_stackNodeDelegate(nullptr) {
  maybeThrow(NativeNodeApi::getInstance()->registerNodeEvent(
      m_nodeHandle, NODE_ON_CLICK, NODE_ON_CLICK, this));
 maybeThrow(NativeNodeApi::getInstance()->registerNodeEvent(
      m_nodeHandle, NODE_EVENT_ON_APPEAR, NODE_EVENT_ON_APPEAR, this));   
}

void SafeAreaStackNode::insertChild(ArkUINode& child, std::size_t index) {
  maybeThrow(NativeNodeApi::getInstance()->insertChildAt(
      m_nodeHandle, child.getArkUINodeHandle(), static_cast<int32_t>(index)));
}

void SafeAreaStackNode::removeChild(ArkUINode& child) {
  maybeThrow(NativeNodeApi::getInstance()->removeChild(
      m_nodeHandle, child.getArkUINodeHandle()));
}

void SafeAreaStackNode::setStackNodeDelegate(SafeAreaStackNodeDelegate* SafeAreaStackNodeDelegate) {
  m_stackNodeDelegate = SafeAreaStackNodeDelegate;
}

void SafeAreaStackNode::onNodeEvent(
    ArkUI_NodeEventType eventType,
    EventArgs& eventArgs) {
  if (eventType == ArkUI_NodeEventType::NODE_ON_CLICK &&
      eventArgs[3].i32 != 2) {
    onClick();
  }
 
  if (eventType == ArkUI_NodeEventType::NODE_EVENT_ON_APPEAR) {
      if(m_stackNodeDelegate != nullptr) {
         m_stackNodeDelegate->onAppear();
      }
  }
    
}

void SafeAreaStackNode::onClick() {
  if (m_stackNodeDelegate != nullptr) {
    m_stackNodeDelegate->onClick();
  }
}

SafeAreaStackNode::~SafeAreaStackNode() {
  NativeNodeApi::getInstance()->unregisterNodeEvent(
      m_nodeHandle, NODE_ON_CLICK);
    NativeNodeApi::getInstance()->unregisterNodeEvent(
      m_nodeHandle, NODE_EVENT_ON_APPEAR);
    SafeAreaManagerMap::getInstance().RemoveSafeAreaProviderByNodeHandle(m_nodeHandle);
}

SafeAreaStackNode& SafeAreaStackNode::setAlign(int32_t align) {
  ArkUI_NumberValue value[] = {{.i32 = align}};
  ArkUI_AttributeItem item = {.value = value, .size = 1};
  maybeThrow(NativeNodeApi::getInstance()->setAttribute(
      m_nodeHandle, NODE_STACK_ALIGN_CONTENT, &item));
  return *this;
}
} // namespace rnoh
