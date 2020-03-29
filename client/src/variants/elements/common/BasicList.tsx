import React, { useContext } from 'react';
import { TableCell, Box, TableContainer, TableHead, TablePagination, TableRow, Table, TableBody, TableFooter, ListItemText, ListItem, List } from '@material-ui/core';
import TablePaginationActions from '@material-ui/core/TablePagination/TablePaginationActions';

import { commonLanguage as carverUserCommonLanguage } from '../../../core/carver/contexts/publicState/context'
import { VariantProps } from '../../configuration';

import { SocketContext } from '../../../core/react/contexts/Socket'

export interface Row {
    key: string;
    title: string;
}
export interface BasicListOptions {
    rows: Row[];
    clickable: boolean;
}

const commonLanguage = {
    commands: {
        Select: 'SELECT',
        UpdatePage: 'UPDATE_PAGE',
        UpdateLimit: 'UPDATE_LIMIT'
    }
}
interface Props extends VariantProps {
    options: BasicListOptions;
}
const BasicList: React.FC<Props> = React.memo(({ object, options }) => {
    const { socket } = useContext(SocketContext)

    const widget = object;

    const { rows } = options;

    console.log('**widget:', widget, rows);

    const tableRows = rows.map((row: any) => {

        return <ListItem key={row.key}>
            <ListItemText primary={`${row.title}: ${widget[row.key]}`} />
        </ListItem>
    });

    return <Box>
        <List>
            {tableRows}
        </List>
    </Box>

})

export {
    BasicList,
    commonLanguage
}