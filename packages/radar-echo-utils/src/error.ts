export const throwFileParserError = () => {
  throw new Error('当前文件的校验位出错，阻止后续处理');
};

export const NormalizeError = {
  position: () => {
    throw new Error('输入数据并不属于同一大区域，后续处理无效');
  },
  time: () => {
    throw new Error('输入数据时间前后相差较大，后续处理无效');
  },

  each: (...args: any) => {
    throw new Error(`遍历数据时存在问题${args}`);
  },
};
