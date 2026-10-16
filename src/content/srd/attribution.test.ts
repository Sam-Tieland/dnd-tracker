import { describe, expect, it } from 'vitest';
import { SRD_ATTRIBUTION } from './attribution';

describe('SRD_ATTRIBUTION', () => {
  it('is the statement from the Legal Information page of the SRD 5.2.1, verbatim', () => {
    expect(SRD_ATTRIBUTION).toBe(
      'This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, ' +
        'available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 ' +
        'International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.',
    );
  });
});
