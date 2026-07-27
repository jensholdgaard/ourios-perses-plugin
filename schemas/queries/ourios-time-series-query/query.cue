package model

import (
	"strings"
	ds "github.com/ourios/ourios/schemas/datasources/ourios-datasource:model"
)

kind: "OuriosTimeSeriesQuery"
spec: close({
	ds.#selector
	query: strings.MinRunes(1)
})
