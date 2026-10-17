// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deliverFile, type DeliverEnv } from './deliver';

const env = (patch: Partial<DeliverEnv>): DeliverEnv => ({ preferShare: false, document, ...patch });

describe('deliverFile', () => {
  afterEach(() => vi.restoreAllMocks());

  it('downloads the file on a PC', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('kael.json');
    });
    expect(await deliverFile('kael.json', '{}', env({}))).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it('opens the share sheet on a touch device that can share files', async () => {
    const share = vi.fn(async () => {});
    expect(await deliverFile('kael.json', '{}', env({ preferShare: true, canShare: () => true, share }))).toBe(true);
    expect(share).toHaveBeenCalledOnce();
  });

  it('reports a closed share sheet as not delivered', async () => {
    const share = vi.fn(async () => {
      throw new DOMException('cancelled', 'AbortError');
    });
    expect(await deliverFile('kael.json', '{}', env({ preferShare: true, canShare: () => true, share }))).toBe(false);
  });
});

describe('deliverFile with bytes', () => {
  it('delivers bytes with a PDF type', async () => {
    const share = vi.fn(async (_data: ShareData) => {});
    const bytes = new Uint8Array([37, 80, 68, 70]);
    await deliverFile('kael.pdf', bytes, env({ preferShare: true, canShare: () => true, share }), undefined, 'application/pdf');
    const file = share.mock.calls[0]![0].files![0]!;
    expect(file.type).toBe('application/pdf');
    expect(file.name).toBe('kael.pdf');
    expect(file.size).toBe(4);
  });
});
