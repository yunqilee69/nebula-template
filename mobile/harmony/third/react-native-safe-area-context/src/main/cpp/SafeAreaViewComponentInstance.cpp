/**
 * MIT License
 *
 * Copyright (C) 2023 Huawei Device Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
#include "SafeAreaViewComponentInstance.h"
#include "TurboModuleRequest.h"
#include "SafeAreaManagerMap.h"

namespace rnoh {

SafeAreaViewComponentInstance::SafeAreaViewComponentInstance(Context context)
    : BaseRNCSafeAreaViewComponentInstance(std::move(context)) {
    m_safeAreaViewStackNode.setStackNodeDelegate(this);
}

void SafeAreaViewComponentInstance::onChildInserted(ComponentInstance::Shared const &childComponentInstance,
                                                    std::size_t index) {
    super::onChildInserted(childComponentInstance, index);
    m_safeAreaViewStackNode.insertChild(childComponentInstance->getLocalRootArkUINode(), index);
}

void SafeAreaViewComponentInstance::onChildRemoved(ComponentInstance::Shared const &childComponentInstance) {
    super::onChildRemoved(childComponentInstance);
    m_safeAreaViewStackNode.removeChild(childComponentInstance->getLocalRootArkUINode());
};

SafeAreaStackNode &SafeAreaViewComponentInstance::getLocalRootArkUINode() { return m_safeAreaViewStackNode; }

void SafeAreaViewComponentInstance::updateInsert(SharedConcreteProps p) {
    auto parentNodeHandle = findParentNodeHandle(m_safeAreaViewStackNode.getArkUINodeHandle());
    DLOG(INFO) << "SafeAreaViewComponentInstance findParentNodeHandle " << parentNodeHandle.nodeHandle << " hasSafeAreaProvider " << parentNodeHandle.hasSafeAreaProvider;
    if (parentNodeHandle.hasSafeAreaProvider) {
        TurboModuleRequest request;
        safeArea::Event data = request.getTurboModuleData(this->m_deps);
        facebook::react::RNCSafeAreaViewEventEmitter::OnSafeAreaValueChange inset = {data.insets.top, data.insets.right,
                                                                                data.insets.bottom, data.insets.left};
        m_eventEmitter->onSafeAreaValueChange(inset);
    }
    else {
        facebook::react::RNCSafeAreaViewEventEmitter::OnSafeAreaValueChange inset = {0, 0, 0, 0};
        m_eventEmitter->onSafeAreaValueChange(inset);
    }
}

SafeAreaViewComponentInstance::ParentNodeInfo SafeAreaViewComponentInstance::findParentNodeHandle(ArkUI_NodeHandle nodehandle) {
    ParentNodeInfo parentNodeInfo;
    if(!nodehandle) return parentNodeInfo;
    auto parentNode  = OH_ArkUI_NodeUtils_GetParentInPageTree(nodehandle);
    bool hasSafeAreaProvider =  SafeAreaManagerMap::getInstance().GetHasSafeAreaProviderByNodeHandle(parentNode);
    parentNodeInfo.hasSafeAreaProvider = hasSafeAreaProvider;
    parentNodeInfo.nodeHandle = parentNode;
    if (!hasSafeAreaProvider && parentNode) {
        return findParentNodeHandle(parentNode);
    }
    return parentNodeInfo;
}

void SafeAreaViewComponentInstance::onPropsChanged(SharedConcreteProps const &props) {
    super::onPropsChanged(props);
    this->m_SharedConcreteProps = props;
    if(this->m_isFirstShow) {
        return;
    }
    updateInsert(props);
}

void SafeAreaViewComponentInstance::onAppear(){
    if(this->m_isFirstShow && this->m_SharedConcreteProps) {
        updateInsert(this->m_SharedConcreteProps);
        this->m_isFirstShow = false;
    }
}


} // namespace rnoh