import React, { useContext } from 'react';
import { TableCell, Box, TableContainer, TableHead, TablePagination, TableRow, Table, TableBody, TableFooter, CardContent, Card } from '@material-ui/core';
import TablePaginationActions from '@material-ui/core/TablePagination/TablePaginationActions';

import { commonLanguage as carverUserCommonLanguage } from '../../../core/carver/contexts/publicState/context'
import { VariantProps } from '../../configuration';

import { SocketContext } from '../../../core/react/contexts/Socket'
import { useTableStyle } from '../../../classes/tableStyle';

export interface Column {
    key: string;
    title: string;
    sortable?: boolean;
    format?: (data: any) => any;
}
export interface VariantCommonTableOptions {
    columns: Column[];
    clickable: boolean;
}

const commonLanguage = {
    commands: {
        Select: 'SELECT',
        UpdatePage: 'UPDATE_PAGE',
        UpdateLimit: 'UPDATE_LIMIT'
    }
}
interface Props {
    state: any;
    options: VariantCommonTableOptions;
    rowMap?: (rows: any[]) => any;
}
const VariantCommonTable: React.FC<Props> = React.memo(({ state, options, rowMap }) => {
    const tableStyle = useTableStyle();
    const { socket } = useContext(SocketContext)

    const { id, rows, hidePagination } = state;

    const { columns } = options;

    if (!rows) {
        return <Box>Loading Table...</Box>
    }

    const onChangePage = (event: React.MouseEvent<HTMLButtonElement> | null, page: number) => {
        socket.command({
            type: carverUserCommonLanguage.commands.Widgets.Command,
            payload: {
                id,
                type: commonLanguage.commands.UpdatePage,
                payload: {
                    page
                }
            }
        });
    }

    const onChangeRowsPerPage: React.ChangeEventHandler<HTMLTextAreaElement | HTMLInputElement> = (event) => {
        const limit = event.target.value
        socket.command({
            type: carverUserCommonLanguage.commands.Widgets.Command,
            payload: {
                id,
                type: commonLanguage.commands.UpdateLimit,
                payload: {
                    limit
                }
            }
        });
    }
    const mappedRows = rowMap ? rowMap(rows) : rows;

    const tableRows = mappedRows.map((row: any, index: number) => {
        const getColumns = () => {
            return columns.map((column, columnIndex) => {
                const value = column.format ? column.format(row) : row[column.key];

                if (columnIndex === 0) {
                    return <TableCell component="th" scope="row" key={column.key}>{value}</TableCell >
                }
                return <TableCell align="right" key={column.key}>{value}</TableCell>
            });
        }
        const onClick = () => {
            if (!options.clickable) {
                return;
            }
            socket.command({
                type: carverUserCommonLanguage.commands.Widgets.Command,
                payload: {
                    id,
                    type: commonLanguage.commands.Select,
                    payload: {
                        id: row.id
                    }
                }
            });
        }

        return <TableRow onClick={onClick} key={row.id} hover className={index % 2 != 0 ? tableStyle.zebraRow : undefined}>{getColumns()}</TableRow>
    });

    const getTableHeader = () => {

        const getColumns = () => {
            return columns.map((column, index) => {
                if (column.sortable) {
                    //@todo

                    /*
                    <TableCell
                        align={true ? 'right' : 'left'}
                        padding={false ? 'none' : 'default'}
                        sortDirection={true ? 'asc' : false}>
                        <TableSortLabel
                            active={true}
                            direction={true ? 'asc' : 'asc'}
                            onClick={(event) => { console.log('*****', event) }}>
                            Block #
                        </TableSortLabel>
                    </TableCell>*/
                }

                return <TableCell key={column.title} align={index === 0 ? 'left' : 'right'} className={tableStyle.headerCell}>{column.title}</TableCell>

            });
        }

        return <TableRow>{getColumns()}</TableRow>
    }
    const getTableFooter = () => {
        if (hidePagination) {
            return null;
        }
        return <TableFooter>
            <TableRow>
                <TablePagination
                    rowsPerPageOptions={state.count >= 10 ? [5, 10, 25] : []}
                    count={state.count}
                    rowsPerPage={state.pageQuery.limit}
                    page={state.pageQuery.page}
                    SelectProps={{
                        inputProps: { 'aria-label': 'rows per page' },
                        native: false,
                    }}

                    onChangePage={onChangePage}
                    onChangeRowsPerPage={onChangeRowsPerPage}
                    ActionsComponent={TablePaginationActions}
                />
            </TableRow>
        </TableFooter>
    }

    return <TableContainer>
        <Table aria-label="simple table" size={'small'}>
            <TableHead className={tableStyle.header}>
                {getTableHeader()}
            </TableHead>
            <TableBody>
                {tableRows}
            </TableBody>
            {getTableFooter()}
        </Table>
    </TableContainer>

})

export {
    VariantCommonTable,
    commonLanguage
}