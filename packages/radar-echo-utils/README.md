# `@zhujianshi/radar-echo-utils`

> 通过解析micaps的雷达拼图数据文件，来生成对应的png图像。

## Usage

```ts
import { parseBuffer, nomalizeBlocks, createMosaic } from '@zhujianshi/radar-echo-utils';

const { infos, min_value, max_value, rows, cols } = normalizeBlocks(
	...buffers.map(parseBuffer)
);
const scale = scaleLinear()
	.domain([min_value, max_value])
	.range(["blue", "red"]);
const buffer = createMosaic({
	ignore: (v) => false,
	iterpolation: (v) => {
		const color = Color(scale(v));
		return color.rgb().array();
	},
	rows,
	cols,
	backgroundColor: [0, 0, 0, 255],
})(...infos.map((info) => info.forEach));

const pngUrl = buffer2png(buffer,rows,cols);

```
