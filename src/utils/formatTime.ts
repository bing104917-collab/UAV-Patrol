import dayjs from 'dayjs'

/**
 * 时间日期转换
 * @param date 当前时间
 * @param format 需要转换的时间格式字符串
 * @returns 返回拼接后的时间字符串
 */
export function formatDate(date: any, format?: string): string {
  if (!date) return ''
  return dayjs(date).format(format ?? 'YYYY-MM-DD HH:mm:ss')
}

/**
 * 表格日期格式化
 */
export function dateFormatter(row: any, column: any, cellValue: any) {
  if (!cellValue) return ''
  return dayjs(cellValue).format('YYYY-MM-DD HH:mm:ss')
}
