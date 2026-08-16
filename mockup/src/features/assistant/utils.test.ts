import { NO_ANSWER, retrieve } from './utils';

describe('assistant retrieval', () => {
  it('answers questions the community documents cover, with a citation', () => {
    const entry = retrieve('when can I put my trash bins out?');
    expect(entry).not.toBeNull();
    expect(entry!.citations.length).toBeGreaterThan(0);
    expect(entry!.citations[0]!.documentId).toBe('d-ccrs');
  });

  it('picks the more specific match when several keywords hit', () => {
    expect(retrieve('how tall can a pergola be?')?.id).toBe('k-pergola');
    expect(retrieve('how much are the dues?')?.id).toBe('k-dues');
  });

  it('is case-insensitive', () => {
    expect(retrieve('POOL HOURS')?.id).toBe(retrieve('pool hours')?.id);
  });

  it('declines questions outside the documents rather than inventing an answer', () => {
    expect(retrieve('what is the weather tomorrow')).toBeNull();
    expect(retrieve('who won the world cup')).toBeNull();
  });

  it('has a refusal that says why, not just that it failed', () => {
    expect(NO_ANSWER).toMatch(/documents/i);
    expect(NO_ANSWER).toMatch(/service request/i);
  });
});
