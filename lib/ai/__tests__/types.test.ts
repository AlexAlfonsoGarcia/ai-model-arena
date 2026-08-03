// lib/ai/__tests__/types.test.ts
import { ModelCapability, ModelModality, ModelAvailability, FinishReason } from '../types';

describe('AI Domain Types', () => {
  test('ModelCapability enum has expected values', () => {
    expect(ModelCapability.Text).toBe('text');
    expect(ModelCapability.Vision).toBe('vision');
    expect(ModelCapability.Audio).toBe('audio');
    expect(ModelCapability.Video).toBe('video');
    expect(ModelCapability.Code).toBe('code');
    expect(ModelCapability.Embedding).toBe('embedding');
  });

  test('ModelModality enum matches capability values', () => {
    expect(ModelModality.Text).toBe('text');
    expect(ModelModality.Image).toBe('image');
    expect(ModelModality.Audio).toBe('audio');
    expect(ModelModality.Video).toBe('video');
    expect(ModelModality.Embedding).toBe('embedding');
  });

  test('ModelAvailability enum', () => {
    expect(ModelAvailability.Stable).toBe('stable');
    expect(ModelAvailability.Preview).toBe('preview');
    expect(ModelAvailability.Deprecated).toBe('deprecated');
  });

  test('FinishReason enum', () => {
    expect(FinishReason.Stop).toBe('stop');
    expect(FinishReason.Length).toBe('length');
    expect(FinishReason.ToolCalls).toBe('tool_calls');
    expect(FinishReason.ContentFilter).toBe('content_filter');
    expect(FinishReason.Fault).toBe('fault');
    expect(FinishReason.Unknown).toBe('unknown');
  });
});