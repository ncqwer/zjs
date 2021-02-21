# `@zjs/case-match`

Read this in other languages: [English](README.md), [简体中文](README.zh-CN.md).

> Description: [experimental] write if-then code using chain mode

> Warning: This project only demonstates the possibility to write if-then code using chain mode. **DON'T USE IT IN PRODUCTION**. 

## Install

```bash
yarn add @zjs/case-match
```

## Usage

```ts
import {createType,pm} from '@zjs/case-match';

const Author = createType<[number,string]>('author');//authorId,authorName
const Book = createType<[number,string,typeof Author]>('book');//bookId,bookTitle,author

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
