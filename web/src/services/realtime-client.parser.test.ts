import { describe, expect, it, vi } from 'vitest';
import { createSseParser } from './realtime-client';

describe('createSseParser', () => {
  it('parses a complete site-message frame', () => {
    const onEvent = vi.fn();
    const parser = createSseParser(onEvent);

    parser.push('id:message-1\nevent:site-message\ndata:{"messageId":"message-1","createTime":"2026-10-09 12:00:00"}\n\n');

    expect(onEvent).toHaveBeenCalledWith({
      id: 'message-1',
      event: 'site-message',
      data: '{"messageId":"message-1","createTime":"2026-10-09 12:00:00"}',
    });
  });

  it('buffers frames split across chunks', () => {
    const onEvent = vi.fn();
    const parser = createSseParser(onEvent);

    parser.push('id:message-1\nevent:site-');
    expect(onEvent).not.toHaveBeenCalled();

    parser.push('message\ndata:{"messageId":"message-1"}\n\n');
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent.mock.calls[0]?.[0]).toMatchObject({ id: 'message-1', event: 'site-message' });
  });

  it('ignores comment-only heartbeat frames', () => {
    const onEvent = vi.fn();
    const parser = createSseParser(onEvent);

    parser.push(': ping\n\n');

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('emits multiple frames from one chunk', () => {
    const onEvent = vi.fn();
    const parser = createSseParser(onEvent);

    parser.push('event:site-message\ndata:a\n\nevent:site-message\ndata:b\n\n');

    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it('joins multi-line data fields with newline', () => {
    const onEvent = vi.fn();
    const parser = createSseParser(onEvent);

    parser.push('event:site-message\ndata:line1\ndata:line2\n\n');

    expect(onEvent.mock.calls[0]?.[0]).toMatchObject({ data: 'line1\nline2' });
  });
});
