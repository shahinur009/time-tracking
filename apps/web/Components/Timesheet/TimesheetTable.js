import { useMemo } from 'react';
import { X } from 'lucide-react';
import { addDays, format } from 'date-fns';
import CellInput, { formatHMS } from './CellInput';
import ProjectRowPicker from './ProjectRowPicker';

const HEADER_BG = '#eef0f3';
const HEADER_TXT = '#9ca3af';
const ROW_DIVIDER = '#f0f0f0';
const COL_DIVIDER = '#e5e7eb';
const CELL_PADDING_DENSE = '10px 8px';
const CELL_PADDING_EXPANDED = '20px 8px';

function dayKey(d) {
    return format(d, 'yyyy-MM-dd');
}

function TimesheetTable({
    weekStart,
    rows,
    cellMap,
    dense = true,
    onRemoveRow,
    onAddProjectRow,
    onCellChange,
    onOpenCellDetails,
    onCellFocus,
    onCellBlur,
    presenceMap,
}) {
    const days = useMemo(
        () => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
        [weekStart],
    );

    const usedIds = rows.map((r) => r.projectId).filter(Boolean);

    const columnTotals = useMemo(() => {
        const totals = days.map(() => 0);
        rows.forEach((row) => {
            if (!row.projectId) return;
            days.forEach((d, i) => {
                const k = dayKey(d);
                const cell = cellMap.get(`${row.projectId}|${k}`);
                if (cell) totals[i] += cell.totalSec;
            });
        });
        return totals;
    }, [rows, days, cellMap]);

    const grandTotal = columnTotals.reduce((a, b) => a + b, 0);
    const cellPadding = dense ? CELL_PADDING_DENSE : CELL_PADDING_EXPANDED;

    return (
        <div
            className="tt-timesheet-wrap"
            style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                overflow: 'visible',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                position: 'relative',
                zIndex: 1,
            }}
        >
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                    <tr>
                        <th
                            style={{
                                ...thStyle,
                                paddingLeft: 18,
                                width: 220,
                                textAlign: 'left',
                                borderRight: `1px dashed ${COL_DIVIDER}`,
                            }}
                        >
                            Projects
                        </th>
                        {days.map((d, i) => (
                            <th
                                key={dayKey(d)}
                                style={{
                                    ...thStyle,
                                    width: 110,
                                    textAlign: 'center',
                                    borderRight:
                                        i < 6 ? `1px dashed ${COL_DIVIDER}` : 'none',
                                }}
                            >
                                {format(d, 'EEE, MMM d')}
                            </th>
                        ))}
                        <th
                            style={{
                                ...thStyle,
                                width: 100,
                                textAlign: 'right',
                                paddingRight: 16,
                            }}
                        >
                            Total:
                        </th>
                        <th style={{ ...thStyle, width: 36 }} />
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rIdx) => {
                        const isPlaceholder = !row.projectId;
                        const rowTotal = days.reduce((sum, d) => {
                            if (isPlaceholder) return sum;
                            const cell = cellMap.get(`${row.projectId}|${dayKey(d)}`);
                            return sum + (cell?.totalSec || 0);
                        }, 0);

                        return (
                            <tr key={row.key}>
                                <td
                                    style={{
                                        ...tdStyle,
                                        padding: cellPadding,
                                        paddingLeft: 18,
                                        borderRight: `1px dashed ${COL_DIVIDER}`,
                                        borderBottom: `1px solid ${ROW_DIVIDER}`,
                                    }}
                                >
                                    {isPlaceholder ? (
                                        <ProjectRowPicker
                                            usedIds={usedIds}
                                            onPick={(p) => onAddProjectRow?.(row.key, p)}
                                        />
                                    ) : (
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 8,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    background: row.color || '#8C8C8C',
                                                }}
                                            />
                                            <span
                                                style={{
                                                    fontSize: 13,
                                                    color: '#1f2937',
                                                }}
                                            >
                                                {row.name}
                                            </span>
                                        </span>
                                    )}
                                </td>
                                {days.map((d, i) => {
                                    const k = dayKey(d);
                                    const cell = isPlaceholder
                                        ? null
                                        : cellMap.get(`${row.projectId}|${k}`);
                                    const trackerSec = cell?.trackerSec || 0;
                                    const totalSec = cell?.totalSec || 0;
                                    const lockedReason =
                                        trackerSec > 0
                                            ? `Includes ${formatHMS(trackerSec)} from timer; cannot lower below this.`
                                            : null;
                                    return (
                                        <td
                                            key={k}
                                            style={{
                                                ...tdStyle,
                                                padding: dense
                                                    ? '6px 8px'
                                                    : '14px 8px',
                                                borderRight:
                                                    i < 6
                                                        ? `1px dashed ${COL_DIVIDER}`
                                                        : 'none',
                                                borderBottom: `1px solid ${ROW_DIVIDER}`,
                                                position: 'relative',
                                            }}
                                        >
                                            {isPlaceholder ? null : (
                                                <CellInput
                                                    valueSec={totalSec}
                                                    dense={dense}
                                                    locked={false}
                                                    lockedReason={lockedReason}
                                                    presence={presenceMap?.get(
                                                        `${row.projectId || 'null'}|${k}`,
                                                    )}
                                                    onFocusCell={() =>
                                                        onCellFocus?.({
                                                            projectId:
                                                                row.projectId || null,
                                                            day: k,
                                                        })
                                                    }
                                                    onBlurCell={() =>
                                                        onCellBlur?.({
                                                            projectId:
                                                                row.projectId || null,
                                                            day: k,
                                                        })
                                                    }
                                                    onCommit={(secs) =>
                                                        onCellChange?.({
                                                            projectId: row.projectId,
                                                            day: k,
                                                            durationSec: secs,
                                                            cell,
                                                        })
                                                    }
                                                    onOpenDetails={() =>
                                                        onOpenCellDetails?.({
                                                            row,
                                                            day: k,
                                                            cell,
                                                        })
                                                    }
                                                />
                                            )}
                                        </td>
                                    );
                                })}
                                <td
                                    style={{
                                        ...tdStyle,
                                        padding: cellPadding,
                                        paddingRight: 16,
                                        textAlign: 'right',
                                        fontVariantNumeric: 'tabular-nums',
                                        color: rowTotal ? '#111' : '#9ca3af',
                                        fontWeight: rowTotal ? 600 : 400,
                                        borderBottom: `1px solid ${ROW_DIVIDER}`,
                                    }}
                                >
                                    {isPlaceholder ? '00:00:00' : formatHMS(rowTotal)}
                                </td>
                                <td
                                    style={{
                                        ...tdStyle,
                                        padding: cellPadding,
                                        textAlign: 'center',
                                        borderBottom: `1px solid ${ROW_DIVIDER}`,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => onRemoveRow?.(row)}
                                        title="Remove row"
                                        style={{
                                            all: 'unset',
                                            cursor: 'pointer',
                                            color: '#bdbdbd',
                                            padding: 4,
                                            display: 'inline-flex',
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.color = '#ef4444')
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.color = '#bdbdbd')
                                        }
                                    >
                                        <X size={14} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    <tr>
                        <td
                            style={{
                                ...tdStyle,
                                padding: '12px 8px 12px 18px',
                                background: '#f6f7f9',
                                color: '#9ca3af',
                                fontSize: 13,
                                borderRight: `1px dashed ${COL_DIVIDER}`,
                            }}
                        >
                            Total:
                        </td>
                        {columnTotals.map((t, i) => (
                            <td
                                key={`tot-${i}`}
                                style={{
                                    ...tdStyle,
                                    padding: '12px 8px',
                                    background: '#f6f7f9',
                                    textAlign: 'center',
                                    fontVariantNumeric: 'tabular-nums',
                                    color: t ? '#111' : '#9ca3af',
                                    fontWeight: t ? 600 : 400,
                                    borderRight:
                                        i < 6 ? `1px dashed ${COL_DIVIDER}` : 'none',
                                }}
                            >
                                {formatHMS(t)}
                            </td>
                        ))}
                        <td
                            style={{
                                ...tdStyle,
                                padding: '12px 16px 12px 8px',
                                background: '#f6f7f9',
                                textAlign: 'right',
                                fontVariantNumeric: 'tabular-nums',
                                color: grandTotal ? '#111' : '#9ca3af',
                                fontWeight: grandTotal ? 700 : 600,
                            }}
                        >
                            {formatHMS(grandTotal)}
                        </td>
                        <td
                            style={{
                                ...tdStyle,
                                padding: '12px 8px',
                                background: '#f6f7f9',
                            }}
                        />
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

const thStyle = {
    background: HEADER_BG,
    color: HEADER_TXT,
    fontWeight: 500,
    fontSize: 13,
    padding: '12px 8px',
    borderBottom: '1px solid #e5e7eb',
};

const tdStyle = {
    background: '#fff',
    fontSize: 13,
    verticalAlign: 'middle',
    transition: 'padding 240ms cubic-bezier(0.22, 1, 0.36, 1)',
};

export default TimesheetTable;
