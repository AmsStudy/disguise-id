import { parseMlExecutionConfig } from '../src/config/ml-execution.config';

describe('ml-execution.config', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should parse valid v1 mode', () => {
    const config = parseMlExecutionConfig({ ML_EXECUTION_MODE: 'v1' });
    expect(config.mode).toBe('v1');
  });

  it('should parse valid dual mode', () => {
    const config = parseMlExecutionConfig({ ML_EXECUTION_MODE: 'dual' });
    expect(config.mode).toBe('dual');
  });

  it('should parse valid v2_shadow mode', () => {
    const config = parseMlExecutionConfig({ ML_EXECUTION_MODE: 'v2_shadow' });
    expect(config.mode).toBe('v2_shadow');
  });

  it('should fallback to dual mode if undefined', () => {
    const config = parseMlExecutionConfig({});
    expect(config.mode).toBe('dual');
  });

  it('should reject invalid mode and throw an error', () => {
    expect(() => {
      parseMlExecutionConfig({ ML_EXECUTION_MODE: 'invalid_mode' });
    }).toThrow('Invalid ML_EXECUTION_MODE configuration: invalid_mode');
  });
});
