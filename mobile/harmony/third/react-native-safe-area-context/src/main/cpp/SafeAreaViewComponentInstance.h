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
#pragma once
#include "RNOH/CppComponentInstance.h"
#include "SafeAreaBeanData.h"
#include "SafeAreaColumnNode.h"
#include "SafeAreaStackNode.h"
#include "SafeAreaProviderComponentInstance.h"
#include "generated/RNOH/generated/components/BaseRNCSafeAreaViewComponentInstance.h"
#include "generated/react/renderer/components/react_native_safe_area_context/EventEmitters.h"

namespace rnoh {
    class SafeAreaViewComponentInstance : public BaseRNCSafeAreaViewComponentInstance,SafeAreaStackNodeDelegate {
    
    using super = BaseRNCSafeAreaViewComponentInstance;
    
    struct ParentNodeInfo {
        ArkUI_NodeHandle nodeHandle = nullptr;
        bool hasSafeAreaProvider = false;
    };
    
    private:
        SafeAreaStackNode m_safeAreaViewStackNode;
        bool m_isFirstShow = true;
        SharedConcreteProps m_SharedConcreteProps;
    public:
        SafeAreaViewComponentInstance(Context context);

        void onChildInserted(ComponentInstance::Shared const &childComponentInstance, std::size_t index) override;

        void onChildRemoved(ComponentInstance::Shared const &childComponentInstance) override;

        void onPropsChanged(SharedConcreteProps const &props) override;

        SafeAreaStackNode &getLocalRootArkUINode() override;

        void updateInsert(SharedConcreteProps p);
    
        void onAppear() override;
    
        ParentNodeInfo findParentNodeHandle(ArkUI_NodeHandle nodehandle);
    };
} // namespace rnoh