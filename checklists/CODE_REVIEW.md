# Code Review Checklist

## Correctness

- [ ] requirement behavior matches code
- [ ] boundary cases tested
- [ ] date/time behavior deterministic
- [ ] transaction failures handled
- [ ] async races considered
- [ ] stale UI after DB update avoided

## Architecture

- [ ] domain independent of framework/browser
- [ ] repositories hide Dexie
- [ ] content separate from UI
- [ ] no giant catch-all service
- [ ] no duplicated source of truth

## React

- [ ] effects have correct dependencies
- [ ] no unnecessary effect for derived state
- [ ] stable keys
- [ ] forms accessible
- [ ] async state cancellation/ignore stale result
- [ ] route error boundaries

## PWA

- [ ] cache strategy appropriate
- [ ] versioning explicit
- [ ] update safe
- [ ] base path correct

## Learning integrity

- [ ] four-choice recognition does not imply production mastery
- [ ] hints reduce mastery gain
- [ ] Again behavior correct
- [ ] beginner examples respect prerequisites
- [ ] UI does not make official score claims

## Maintainability

- [ ] names reveal intent
- [ ] comments explain why, not obvious what
- [ ] no unexplained magic numbers
- [ ] algorithm constants centralized
- [ ] docs updated
