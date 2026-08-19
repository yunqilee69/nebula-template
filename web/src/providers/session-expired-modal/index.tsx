import { Modal } from 'antd';
import { useEffect, useState } from 'react';
import { clearAuthTokens } from '@/utils/auth/token-session';
import { resolveSessionExpired, subscribeSessionExpired } from '@/utils/auth/session-expired';
import { createLoginRedirectPath, getCurrentAuthReturnPath } from '@/utils/auth/return-path';
import { useAuthStore } from '@/stores/auth-store';

export function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => subscribeSessionExpired(() => setOpen(true)), []);

  const clearSession = () => {
    clearAuthTokens();
    clearUser();
  };

  return (
    <Modal
      open={open}
      title="登录状态已失效"
      okText="重新登录"
      cancelText="留在当前页面"
      onOk={() => {
        clearSession();
        resolveSessionExpired();
        setOpen(false);
        window.location.assign(createLoginRedirectPath('/login', getCurrentAuthReturnPath()));
      }}
      onCancel={() => {
        setOpen(false);
      }}
    >
      当前登录状态已失效，请重新登录后继续操作。
    </Modal>
  );
}
