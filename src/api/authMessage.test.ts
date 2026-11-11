import { describe, expect, it } from 'vitest';
import { authMessage } from './supabase';

describe('mensagens do Supabase Auth em português', () => {
  it('traduz limite de e-mail e de tentativas', () => {
    expect(authMessage('email rate limit exceeded')).toMatch(/Muitas tentativas/);
    expect(authMessage('Request rate limit reached')).toMatch(/Muitas tentativas/);
  });
  it('traduz login, cadastro repetido e senha', () => {
    expect(authMessage('Invalid login credentials')).toBe('E-mail ou senha inválidos.');
    expect(authMessage('User already registered')).toMatch(/Já existe um cadastro/);
    expect(authMessage('New password should be different from the old password.')).toMatch(/diferente da atual/);
    expect(authMessage('Password should be at least 6 characters.')).toMatch(/pelo menos 6/);
  });
  it('mantém mensagens desconhecidas', () => {
    expect(authMessage('algo novo')).toBe('algo novo');
  });
});
