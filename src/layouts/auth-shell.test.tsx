import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NebulaBrandProvider } from '@/providers/brand-context';
import { AuthShell } from './auth-shell';

describe('AuthShell styling', () => {
  it('uses Tailwind layout utilities while rendering brand content', () => {
    const { container } = render(
      <NebulaBrandProvider brand={{ name: 'Nebula Test' }}>
        <AuthShell>
          <button type="button">Login</button>
        </AuthShell>
      </NebulaBrandProvider>,
    );

    const shell = container.firstElementChild;

    expect(shell).toHaveClass('flex', 'min-h-dvh', 'items-center', 'justify-center');
    expect(screen.getByRole('heading', { name: 'Nebula Test' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });
});
