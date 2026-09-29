import { loginLogService, type LoginLogService } from '@/services/login-log';
import { LoginLogTable } from './components/login-log-table';

export interface LoginLogPageProps {
  readonly service?: LoginLogService;
}

export function LoginLogPage({ service: serviceProp }: LoginLogPageProps) {
  const service = serviceProp ?? loginLogService;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <LoginLogTable service={service} />
      </div>
    </div>
  );
}

export default LoginLogPage;
