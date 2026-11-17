---
title: Synced Code Groups
order: 3
description: Code groups that share a name show the tab the reader last chose, on every page.
---

Give a VitePress code group a name and it follows the reader's choice:
picking a tab in one group switches every group with the same name, on
this page and on every other, and the choice is still there on the next
visit.

````md
::: code-group lang

```js [JavaScript]
session.call('com.example.add', [2, 3])
```

```erlang [Erlang]
call(Session, <<"com.example.add">>, [2, 3]).
```

:::
````

The name is lower-case letters, digits and hyphens. A tab is matched by its
label, ignoring case, so use the same labels in every group of a name.

## How it behaves

Pick **Erlang** below. The second group follows; the third has no Erlang
tab, so it stays as it is.

::: code-group lang

```js [JavaScript]
const sum = await session.call('com.example.add', [2, 3])
```

```erlang [Erlang]
add(Session) ->
    case call(Session, <<"com.example.add">>, [2, 3]) of
        {ok, Result} ->
            Result;
        {error, Reason} ->
            error(Reason)
    end.

%% A longer block than its JavaScript sibling: switching the
%% groups above the one you clicked must not move the one you
%% clicked.
add_all(Session, Pairs) ->
    [add(Session, A, B) || {A, B} <- Pairs].

add(Session, A, B) ->
    {ok, Result} = call(Session, <<"com.example.add">>, [A, B]),
    Result.
```

:::

::: code-group lang

```js [JavaScript]
session.publish('com.example.added', [5])
```

```erlang [Erlang]
publish(Session, <<"com.example.added">>, [5]).
```

```rust [Rust]
session.publish("com.example.added", vec![5]).await?;
```

:::

::: code-group lang

```js [JavaScript]
// Only JavaScript has this helper.
session.onClose(() => console.log('closed'))
```

:::

A group with no name is VitePress's own code group, and follows nothing,
whatever its labels are:

::: code-group

```js [JavaScript]
console.log('independent')
```

```erlang [Erlang]
io:format("independent~n").
```

:::

Each name is its own choice. This group is named `tool`:

::: code-group tool

```sh [npm]
npm install
```

```sh [pnpm]
pnpm install
```

:::

The [component tour](/guide/basics/components#code-group) has another
`lang` group, to see the choice carry across pages.

## Where the choice is kept

In the browser's `localStorage`, under `ls-code-group.<name>`. It is not a
cookie and it is never sent to a server. If the browser blocks site
storage, the groups on a page still follow each other; the choice is not
kept for the next page.
