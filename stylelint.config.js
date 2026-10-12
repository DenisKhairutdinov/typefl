/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-order'],
  ignoreFiles: ['dist/**', 'tilda/dist/**'],
  rules: {
    'order/order': ['custom-properties', 'declarations', 'rules', 'at-rules'],
    // Имена классов по БЭМ: блок__элемент--модификатор
    'selector-class-pattern': [
      '^[a-z0-9]+(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      { message: 'Класс должен иметь вид блок__элемент--модификатор' },
    ],
  },
}
