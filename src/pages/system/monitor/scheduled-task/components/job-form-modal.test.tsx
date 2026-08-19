import { render } from '@testing-library/react';
import { Form } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { JobFormModal } from './job-form-modal';
import type { JobFormValues } from './job-form-modal';

function ModalHarness() {
  const [form] = Form.useForm<JobFormValues>();

  return (
    <NebulaProvider>
      <JobFormModal
        form={form}
        open={false}
        submitting={false}
        detailLoading={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    </NebulaProvider>
  );
}

describe('JobFormModal', () => {
  it('keeps the edit form instance connected while initially closed', async () => {
    render(<ModalHarness />);

    expect(document.body.querySelector('.ant-form')).toBeInTheDocument();
  });
});
