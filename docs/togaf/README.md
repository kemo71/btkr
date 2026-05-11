# Architecture Definition Document (ADD)
## Btkr Valley — وادي بتكر

This folder contains the **TOGAF 9.2 Architecture Definition Document** for
Btkr Valley, KSAA's innovation management platform.

The ADD is structured per the **TOGAF Architecture Development Method (ADM)**,
phases B → E.

| Phase                                | Document                                    | Status   |
| ------------------------------------ | ------------------------------------------- | -------- |
| A — Architecture Vision              | Summarized in §1 of Phase B doc             | Embedded |
| **B — Business Architecture**        | [`01-business-architecture.md`](./01-business-architecture.md) | ✅ Drafted |
| C — Information Systems (Data + App) | `02-information-systems-architecture.md`    | ⏳ TBD    |
| D — Technology Architecture          | `03-technology-architecture.md`             | ⏳ TBD    |
| E — Opportunities & Solutions        | `04-opportunities-and-solutions.md`         | ⏳ TBD    |
| F — Migration Planning               | `05-migration-plan.md`                      | ⏳ TBD    |
| G — Implementation Governance        | Tracked via `docs/operations/` + ADRs       | ⏳ TBD    |
| H — Architecture Change Management   | Tracked via ADRs in `docs/adr/`             | ⏳ TBD    |

## Related compliance documents

- **NCA ECC mapping** — [`docs/security/nca-ecc-mapping.md`](../security/nca-ecc-mapping.md) *(stub)*
- **DGA design adherence** — [`docs/compliance/dga-design-adherence.md`](../compliance/dga-design-adherence.md) *(stub)*
- **ITIL 4 service design** — [`docs/operations/`](../operations/) *(stub)*
- **Architecture Decision Records** — [`docs/adr/`](../adr/) *(stub)*

## Reading order for new joiners

1. Read **Phase B** (`01-business-architecture.md`) — *what* and *why*
2. Read **Phase C** — *the data and module map*
3. Read **Phase D** — *containers, region pinning, observability*
4. Read **operational runbooks** in `docs/operations/`

## Change management

- Substantive ADD changes require an **ADR** in `docs/adr/`
- ADD documents are versioned alongside code in git; no external doc system
- Quarterly **architecture review** owned by the Innovation Office + CISO
