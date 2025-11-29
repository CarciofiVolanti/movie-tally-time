import { describe, it, expect, vi, afterEach } from 'vitest';
import Cookies from 'js-cookie';
import { getSelectedPersonForSession, setSelectedPersonForSession } from '../sessionCookies';

// Mock js-cookie to avoid actual browser cookie interactions during tests
vi.mock('js-cookie', () => {
  return {
    default: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    }
  };
});

describe('sessionCookies', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // Test retrieving a cookie value
  it('getSelectedPersonForSession retrieves value from cookie', () => {
    const mockSessionId = 'sess-123';
    (Cookies.get as any).mockReturnValue('person-abc');
    
    const result = getSelectedPersonForSession(mockSessionId);
    
    expect(Cookies.get).toHaveBeenCalledWith(`selectedPerson_${mockSessionId}`);
    expect(result).toBe('person-abc');
  });

  // Test handling when no cookie exists
  it('getSelectedPersonForSession returns empty string if no cookie', () => {
    (Cookies.get as any).mockReturnValue(undefined);
    
    const result = getSelectedPersonForSession('sess-404');
    expect(result).toBe('');
  });

  // Test setting the cookie
  it('setSelectedPersonForSession sets cookie with expiry', () => {
    const sessionId = 'sess-1';
    const personId = 'p-1';
    
    setSelectedPersonForSession(sessionId, personId);
    
    expect(Cookies.set).toHaveBeenCalledWith(
      `selectedPerson_${sessionId}`,
      personId,
      expect.objectContaining({ expires: 30 })
    );
  });

  // Test removing the cookie when personId is empty (user deselection)
  it('setSelectedPersonForSession removes cookie if personId is empty', () => {
    setSelectedPersonForSession('sess-1', '');
    expect(Cookies.remove).toHaveBeenCalledWith('selectedPerson_sess-1');
  });
});
