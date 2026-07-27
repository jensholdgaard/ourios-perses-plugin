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
spec: {
	commonProxy.#baseHTTPDatasourceSpec
}

#selector: common.#datasourceSelector & {_kind: #kind}
