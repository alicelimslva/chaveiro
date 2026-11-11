import { expect, test } from '@playwright/test';

// Roda em MODO DEMO (sem variáveis do Supabase).
test('fluxo do balcão: login → nova ordem → status → acompanhamento público', async ({ page, context }) => {
  await page.goto('/app/login');
  await page.getByLabel('E-mail').fill('ana@demo.com');
  await page.getByLabel('Senha').fill('demo123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();

  await expect(page.getByRole('heading', { name: 'Painel do dia' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Atrasadas' })).toContainText('Rafael Lima');

  // Nova ordem com cliente novo
  await page.getByRole('button', { name: /Nova ordem/ }).click();
  await page.getByRole('button', { name: 'Cliente novo' }).click();
  await page.getByLabel('Nome').fill('Paula Teste');
  await page.getByLabel('WhatsApp').fill('11988887777');
  await page.getByRole('button', { name: /Cópia de chaves/ }).click();
  await page.getByLabel('O que será feito').fill('4 cópias tetra');
  await page.getByLabel('Valor total (R$)').fill('48,00');
  await page.getByLabel('Sinal pago (R$)').fill('20');
  await page.getByLabel('Prazo').fill('2030-01-10T18:00');
  await page.getByRole('button', { name: 'Abrir ordem' }).click();

  await expect(page.getByRole('heading', { name: 'Paula Teste' })).toBeVisible();
  await expect(page.getByText('R$ 28,00')).toBeVisible(); // saldo

  await page.getByRole('button', { name: 'Depois' }).click();
  await page.getByRole('button', { name: 'Em andamento' }).click();
  await expect(page.getByText('Recebido → Em andamento')).toBeVisible();

  // Link público
  const code = (await page.getByText(/código [A-Z0-9]{8}/).textContent())!.match(/código ([A-Z0-9]{8})/)![1];
  const pub = await context.newPage();
  await pub.goto(`/acompanhar/${code}`);
  await expect(pub.getByText('Olá, Paula!')).toBeVisible();
  await expect(pub.getByText('Situação atual')).toBeVisible();
  await expect(pub.getByText('Em andamento').first()).toBeVisible();
});

test('atendente não acessa área do administrador', async ({ page }) => {
  await page.goto('/app/login');
  await page.getByLabel('E-mail').fill('ana@demo.com');
  await page.getByLabel('Senha').fill('demo123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Painel do dia' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Relatórios' })).toHaveCount(0);
  await page.goto('/app/admin/usuarios');
  await expect(page.getByText('Acesso restrito')).toBeVisible();
});

test('vitrine pública mostra serviços com WhatsApp', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Serviços' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chave automotiva' })).toBeVisible();
  const wa = page.getByRole('link', { name: 'WhatsApp', exact: true }).first();
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/55/);
});

test('alterar senha: confere a atual e a nova passa a valer no login', async ({ page }) => {
  const login = async (pw: string) => {
    await page.goto('/app/login');
    await page.getByLabel('E-mail').fill('bruno@demo.com');
    await page.getByLabel('Senha').fill(pw);
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
  };
  await login('demo123');
  await expect(page.getByRole('heading', { name: 'Painel do dia' })).toBeVisible();

  await page.getByRole('button', { name: 'Conta' }).click();
  await page.getByRole('menuitem', { name: 'Alterar senha' }).click();
  await expect(page.getByRole('heading', { name: 'Alterar senha' })).toBeVisible();

  // Senha atual errada
  await page.getByLabel('Senha atual').fill('errada1');
  await page.getByLabel('Senha nova', { exact: true }).fill('nova4567');
  await page.getByLabel('Repita a senha nova').fill('nova4567');
  await page.getByRole('button', { name: 'Salvar senha' }).click();
  await expect(page.getByRole('alert')).toHaveText('Senha atual incorreta.');

  // Confirmação diferente
  await page.getByLabel('Senha atual').fill('demo123');
  await page.getByLabel('Repita a senha nova').fill('outra999');
  await page.getByRole('button', { name: 'Salvar senha' }).click();
  await expect(page.getByRole('alert')).toContainText('confirmação');

  // Certo
  await page.getByLabel('Repita a senha nova').fill('nova4567');
  await page.getByRole('button', { name: 'Salvar senha' }).click();
  await expect(page.getByText('Senha alterada')).toBeVisible();

  await page.getByRole('button', { name: 'Conta' }).click();
  await page.getByRole('menuitem', { name: 'Sair' }).click();
  await login('demo123');
  await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
  await login('nova4567');
  await expect(page.getByRole('heading', { name: 'Painel do dia' })).toBeVisible();
});
