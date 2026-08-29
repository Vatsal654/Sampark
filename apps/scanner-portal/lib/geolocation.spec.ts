import { isSecureContextForGeolocation, mapGeolocationErrorCode, captureLocation, type GeolocationLike } from './geolocation';

describe('isSecureContextForGeolocation', () => {
  it('is false when window is undefined (SSR / no window at all)', () => {
    expect(isSecureContextForGeolocation(undefined)).toBe(false);
  });

  it('is false for a plain http:// origin — the exact case of a LAN-IP physical-device test (http://192.168.1.8:3000)', () => {
    expect(isSecureContextForGeolocation({ isSecureContext: false })).toBe(false);
  });

  it('is true for https:// or the localhost/127.0.0.1 loopback exception', () => {
    expect(isSecureContextForGeolocation({ isSecureContext: true })).toBe(true);
  });
});

describe('mapGeolocationErrorCode', () => {
  it('maps code 1 to permission_denied', () => {
    expect(mapGeolocationErrorCode(1)).toBe('permission_denied');
  });

  it('maps code 3 to timeout', () => {
    expect(mapGeolocationErrorCode(3)).toBe('timeout');
  });

  it('maps code 2 (POSITION_UNAVAILABLE) and any unrecognized code to position_unavailable, never a false "denied"', () => {
    expect(mapGeolocationErrorCode(2)).toBe('position_unavailable');
    expect(mapGeolocationErrorCode(99)).toBe('position_unavailable');
  });
});

describe('captureLocation', () => {
  function fakeGeolocation(behavior: 'success' | { code: number }): GeolocationLike {
    return {
      getCurrentPosition: (onSuccess, onError) => {
        if (behavior === 'success') {
          onSuccess({ coords: { latitude: 27.7172, longitude: 85.324 } });
        } else {
          onError({ code: behavior.code, message: 'simulated' });
        }
      },
    };
  }

  it('resolves to a ready state with the captured coordinates on success', async () => {
    const result = await captureLocation(fakeGeolocation('success'));
    expect(result).toEqual({ status: 'ready', location: { latitude: 27.7172, longitude: 85.324 } });
  });

  it('resolves to an unavailable state (never throws/rejects) when the user denies permission', async () => {
    const result = await captureLocation(fakeGeolocation({ code: 1 }));
    expect(result).toEqual({ status: 'unavailable', reason: 'permission_denied' });
  });

  it('resolves to an unavailable state when the position genuinely could not be determined', async () => {
    const result = await captureLocation(fakeGeolocation({ code: 2 }));
    expect(result).toEqual({ status: 'unavailable', reason: 'position_unavailable' });
  });

  it('resolves to an unavailable state on a timeout', async () => {
    const result = await captureLocation(fakeGeolocation({ code: 3 }));
    expect(result).toEqual({ status: 'unavailable', reason: 'timeout' });
  });

  it('resolves to an unavailable/timeout state on its own, within ~8.5s, even if the browser never calls either callback at all', async () => {
    jest.useFakeTimers();
    const neverResolvingGeolocation: GeolocationLike = { getCurrentPosition: () => {} };

    const resultPromise = captureLocation(neverResolvingGeolocation);
    jest.advanceTimersByTime(8500);
    const result = await resultPromise;

    expect(result).toEqual({ status: 'unavailable', reason: 'timeout' });
    jest.useRealTimers();
  });
});
