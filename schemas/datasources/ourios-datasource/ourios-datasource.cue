package model

import (
	"github.com/perses/shared/cue/common"
	commonProxy "github.com/perses/shared/cue/common/proxy"
)

// NOTE: `percli plugin generate` scaffolds against `perses/perses/cue`, which
// does not define `#datasourceSelector` at all — so a query plugin that
// references this datasource cannot validate. The bundled plugins (Loki,
// Prometheus) instead use `perses/shared/cue`, vendored under cue.mod/pkg.
// `#kind`/`#selector` are likewise not generated and must be added by hand.
#kind: "OuriosDatasource"

kind: #kind

// The fields are spelled out rather than embedding
// `commonProxy.#baseHTTPDatasourceSpec`, which is a disjunction of two *closed*
// structs: embedding it leaves no room for `tenant`, and Perses rejects the
// datasource with "spec.tenant: field not allowed" — including the very
// example in this plugin's README.
//
// Neither is "exactly one of directUrl/proxy" expressed as a disjunction here:
// with both arms optional CUE cannot pick a branch and fails the resource as an
// incomplete value. The frontend prefers the proxy when both are set.
spec: {
	// tenant is sent as the x-ourios-tenant header on every query (RFC 0026).
	// Required: the query API is tenant-scoped, so there is no useful default.
	tenant: string

	// Reach the querier straight from the browser...
	directUrl?: common.#url
	// ...or through the Perses server's proxy, which is what a querier bound
	// to loopback (or behind auth) needs.
	proxy?: commonProxy.#HTTPProxy
}

#selector: common.#datasourceSelector & {_kind: #kind}
