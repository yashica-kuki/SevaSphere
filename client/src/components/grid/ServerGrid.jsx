import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, themeQuartz } from "ag-grid-community";
import { Download, Search, Columns3, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeQuartz.withParams({
  accentColor: "#123B32",
  headerBackgroundColor: "#E5EEE8",
  headerTextColor: "#123B32",
  fontFamily: "Inter, system-ui, sans-serif",
  borderRadius: 10,
  wrapperBorderRadius: 14,
});

/**
 * Real AG Grid Community using the Infinite Row Model: sorting, filtering and
 * pagination are executed by the backend (see server/src/services/gridService.js).
 */
export default function ServerGrid({
  endpoint,            // e.g. "/donor/grids/donations"
  columns,             // AG Grid column defs
  extraParams = {},    // e.g. { scope: "all" }
  searchPlaceholder = "Search…",
  pageSize = 10,
  height = 520,
  rowHeight,           // optional fixed row height (px) for grids with wrapped text
  refreshKey = 0,
  onRowClicked,
  emptyMessage = "No records found.",
  csv = true,
}) {
  const gridRef = useRef(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [state, setState] = useState({ loading: true, error: "", total: null });
  const [showCols, setShowCols] = useState(false);
  const [hidden, setHidden] = useState({});

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const paramsKey = JSON.stringify(extraParams);

  const datasource = useMemo(
    () => ({
      getRows: async (p) => {
        setState((s) => ({ ...s, loading: true, error: "" }));
        try {
          const { data } = await api.get(endpoint, {
            params: {
              ...JSON.parse(paramsKey),
              startRow: p.startRow,
              endRow: p.endRow,
              sortModel: JSON.stringify(p.sortModel),
              filterModel: JSON.stringify(p.filterModel),
              search: debounced || undefined,
            },
          });
          p.successCallback(data.rows, data.total);
          setState({ loading: false, error: "", total: data.total });
        } catch (e) {
          p.failCallback();
          setState({ loading: false, error: e.message, total: null });
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpoint, paramsKey, debounced, refreshKey]
  );

  const defaultColDef = useMemo(
    () => ({ sortable: true, resizable: true, filter: true, floatingFilter: false, minWidth: 110, flex: 1 }),
    []
  );

  const exportCsv = useCallback(async () => {
    try {
      const api2 = gridRef.current?.api;
      const { data } = await api.get(endpoint, {
        params: {
          ...extraParams,
          format: "csv",
          search: debounced || undefined,
          sortModel: JSON.stringify(api2?.getColumnState().filter((c) => c.sort).map((c) => ({ colId: c.colId, sort: c.sort })) ?? []),
          filterModel: JSON.stringify(api2?.getFilterModel() ?? {}),
        },
        responseType: "blob",
      });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${endpoint.split("/").pop()}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message || "Export failed");
    }
  }, [endpoint, extraParams, debounced]);

  const toggleCol = (colId, visible) => {
    gridRef.current?.api.setColumnsVisible([colId], visible);
    setHidden((h) => ({ ...h, [colId]: !visible }));
  };

  const colList = columns.filter((c) => c.field);

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#829087]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search table"
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-forest"
          />
        </div>
        <div className="relative">
          <button type="button" onClick={() => setShowCols((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-forest hover:bg-ivory">
            <Columns3 size={16} /> Columns
          </button>
          {showCols && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-border bg-white p-3 shadow-lg">
              {colList.map((c) => (
                <label key={c.field} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                  <input type="checkbox" checked={!hidden[c.field]} onChange={(e) => toggleCol(c.field, e.target.checked)} />
                  {c.headerName || c.field}
                </label>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={() => gridRef.current?.api.refreshInfiniteCache()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-forest hover:bg-ivory" aria-label="Refresh">
          <RefreshCw size={16} />
        </button>
        {csv && (
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#194c40]">
            <Download size={16} /> Export CSV
          </button>
        )}
      </div>

      {state.error && <div role="alert" className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>}

      <div className="relative" style={{ height }}>
        <AgGridReact
          ref={gridRef}
          theme={theme}
          columnDefs={columns}
          defaultColDef={defaultColDef}
          rowModelType="infinite"
          datasource={datasource}
          rowHeight={rowHeight}
          tooltipShowDelay={300}
          cacheBlockSize={pageSize}
          pagination
          paginationPageSize={pageSize}
          paginationPageSizeSelector={[10, 25, 50]}
          onPaginationChanged={() => {}}
          onRowClicked={onRowClicked ? (e) => e.data && onRowClicked(e.data) : undefined}
          rowSelection={undefined}
          suppressCellFocus
          overlayNoRowsTemplate={`<span style="color:#64716B">${emptyMessage}</span>`}
          getRowId={(p) => p.data?.id}
        />
        {state.loading && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden bg-sage">
            <div className="h-full w-1/3 animate-pulse bg-forest" />
          </div>
        )}
      </div>
      {state.total === 0 && !state.loading && !state.error && <p className="border-t border-border px-4 py-3 text-center text-sm text-[#64716B]">{emptyMessage}</p>}
    </div>
  );
}
