# `@zhujianshi/case-match`




> Description: [experimental] 使用链式写法来书写`if-then`风格的代码 

> Warning: 本项目目前仅仅用于验证使书写`if-then`风格的代码的一种形式的可能性. **不要在生产环境中使用**. 


## Install

```bash
yarn add @zhujianshi/case-match
```

## Usage

```ts
import {createType,pm} from '@zhujianshi/case-match';

import {createType,pm,base} from '@zhujianshi/case-match';

const Author = createType('author',base.number,base.string);//authorId,authorName
const Book = createType('book',base.number,base.string,Author);//bookId,bookTitle,author

const adt2Obj = pm
  .case(Author,(authorId,authorName)=>({authorId,authorName}))
  .case(Book,(bookId,bookTitle,author)=>({
    bookId,
    bookTitle,
    author,//readme: this is adt value
  }))

const author = Author(1,'Jack');
const book = Book(1,'Jack\'s book',author);

deepEqual(adt2Obj(author) ,{
  authorId:1,
  authorName:'Jack',
});
deepEqual(adt2Obj(book) ,{
    bookId:1,
    bookTitle:'Jack\'s book',
    author,//readme: this is adt value
});
```
