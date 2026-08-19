import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NebulaContentOnlyLayout } from './nebula-content-only-layout';

describe('NebulaContentOnlyLayout', () => {
  it('renders only business content without shell regions', () => {
    render(
      <MemoryRouter initialEntries={['/ops']}>
        <NebulaContentOnlyLayout>
          <Routes>
            <Route path="/ops" element={<h1>业务内容</h1>} />
          </Routes>
        </NebulaContentOnlyLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole('main')).toHaveTextContent('业务内容');
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '面包屑' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
