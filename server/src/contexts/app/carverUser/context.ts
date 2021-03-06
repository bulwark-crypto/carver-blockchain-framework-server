import { Context } from '../../../classes/interfaces/context'
import { withState, Reducer } from '../../../classes/logic/withState'
import { RemoteContextStore, ContextMap } from '../../../classes/contexts/contextMap';
import { RegisteredContext } from '../../../classes/contexts/registeredContext';
import { getPage, findPageByPathname } from './pages'
import { config } from '../../../../config';
import { Page } from './sharedInterfaces';

interface DispatchToWidgetPayload {
    id: string;
    payload: any;
}
export interface WidgetContext {
    id: string;
    variant: any;
    isShared: boolean;
}

export interface WidgetBindingParams {
    id: string;
    contextMap: ContextMap;

    userWidgetsContextStore?: RemoteContextStore;
    sharedWidgetsContextStore?: RemoteContextStore;
    carverUser?: RegisteredContext;
    carverUserId?: string;
    variantParams: any; // Will always contain at least { variant }
}
/*
const withQueryInsertNewWidgetContexts: Reducer = ({ state, event }) => {
    const newWidgetContexts = event.payload as WidgetContext[];
    const ids = newWidgetContexts.map(newWidgetContext => newWidgetContext.id);

    return withState(state)
        .emit({
            type: commonLanguage.events.Widgets.Added,
            payload: newWidgetContexts
        })
        .set({
            widgetContexts: [
                ...state.widgetContexts,
                ...newWidgetContexts
            ]
        })
        .query(commonLanguage.queries.InitializeWidgets, ids)

}*/

const withQueryReplacePageWidgetContexts: Reducer = ({ state, event }) => {
    const { pushHistory, removedIds } = event.payload

    const widgetContexts = event.payload.widgetContexts as WidgetContext[];

    const page = event.payload.page as Page;

    const ids = widgetContexts.map(widgetContext => widgetContext.id);

    return withState(state)
        .emit({
            type: commonLanguage.events.Pages.Navigated,
            payload: {
                page,
                widgetContexts,
                pushHistory,
                removedIds
            }
        })
        .set({
            page,
            widgetContexts
        })
        .query(commonLanguage.queries.InitializeWidgets, ids)

}


const withCommandWidgetsEmit: Reducer = ({ state, event }) => {
    //@todo add rate limit. We can also queue events and emit them as a batch

    return withState(state)
        .emit({
            type: commonLanguage.events.Widgets.Emitted,
            payload: event.payload
        });
}
const withCommandWidgetsCommand: Reducer = ({ state, event }) => {
    return withState(state)
        .query(commonLanguage.queries.DispatchToWidget, event.payload as DispatchToWidgetPayload);
}
/*

const withCommandWidgetsRemove: Reducer = ({ state, event }) => {
    const { id } = event.payload;
    const widgetIds = [id];

    return withState(state)
        .emit({
            type: commonLanguage.events.Widgets.Removed,
            payload: widgetIds
        })
        .query(commonLanguage.queries.RemoveWidgetContexts, widgetIds)
}

const withCommandWidgetsAdd: Reducer = ({ state, event }) => {
    const { variant, isShared } = event.payload;

    return withState(state)
        .query(commonLanguage.queries.InsertNewWidgetContexts, [{
            variant,
            isShared
        }])
}
*/

/*
const withCommandConnect: Reducer = ({ state, event }) => {
    if (state.isConnected) {
        throw commonLanguage.errors.isAlreadyConnected;
    }
 
    //@todo emit 
    return withState(state)
        .set({ isConnected: true })
}*/
const withNavigatePage: Reducer = ({ state, event }) => {
    const { page, pushHistory } = event.payload

    const pageData = getPage(page);

    const widgetContextIdsToRemove = state.widgetContexts.map((widgetContext: WidgetContext) => widgetContext.id);

    return withState(state)
        //.query(commonLanguage.queries.RemoveWidgetContexts, { ids: widgetsIdsToRemove })
        .query(commonLanguage.queries.ReplacePageWidgetContexts, { page: pageData, pushHistory, widgetContextIdsToRemove });
}

const withCommandPagesNavigate: Reducer = ({ state, event }) => {
    const page = event.payload;

    return withState(state)
        .reduce({ callback: withNavigatePage, event: { payload: { page, pushHistory: true } } })
}

const withCommandPagesNavigateByPathname: Reducer = ({ state, event }) => {
    const { pathname, pushHistory } = event.payload;

    const page = findPageByPathname(pathname)

    return withState(state)
        .reduce({ callback: withNavigatePage, event: { payload: { page, pushHistory } } })
}

const withCommandInitialize: Reducer = ({ state, event }) => {
    if (state.isInitialized) {
        throw commonLanguage.errors.isAlreadyInitialized;
    }

    const { id, pathname } = event.payload;

    const page = findPageByPathname(pathname)

    return withState(state)
        .set({
            id,
            isInitialized: true
        })
        .emit({ type: commonLanguage.events.Initialized, payload: { id, coin } })
        .reduce({ callback: withNavigatePage, event: { payload: { page, pushHistory: false } } }) // As soon as carver user initializes navigate to blocks page
}

const reducer: Reducer = ({ state, event }) => {
    //@todo add rate limit for incoming commands

    return withState(state)
        .reduce({ type: commonLanguage.commands.Initialize, event, callback: withCommandInitialize }) // This will be called by frontend
        //.reduce({ type: commonLanguage.commands.Connect, event, callback: withCommandConnect })

        //.reduce({ type: commonLanguage.commands.Widgets.Add, event, callback: withCommandWidgetsAdd })
        //.reduce({ type: commonLanguage.commands.Widgets.Remove, event, callback: withCommandWidgetsRemove })
        //.reduce({ type: commonLanguage.queries.InsertNewWidgetContexts, event, callback: withQueryInsertNewWidgetContexts })

        .reduce({ type: commonLanguage.commands.Widgets.Command, event, callback: withCommandWidgetsCommand })
        .reduce({ type: commonLanguage.commands.Widgets.Emit, event, callback: withCommandWidgetsEmit })

        .reduce({ type: commonLanguage.commands.Pages.Navigate, event, callback: withCommandPagesNavigate })
        .reduce({ type: commonLanguage.commands.Pages.NavigateByPathname, event, callback: withCommandPagesNavigateByPathname })

        .reduce({ type: commonLanguage.queries.ReplacePageWidgetContexts, event, callback: withQueryReplacePageWidgetContexts })

        ;
}

const commonLanguage = {
    type: 'CARVER_USER',
    commands: {
        /**
         * Called from the frontend. This will be called first to initialize a user.
         */
        Initialize: 'INITIALIZE',
        //Connect: 'CONNECT',

        Widgets: {

            //@todo adding/removing widgets manually is disabled for now
            //Add: 'WIDGETS:ADD',
            //Remove: 'WIDGETS:REMOVE',

            Command: 'WIDGETS:COMMAND',
            Emit: 'WIDGETS:EMIT'
        },
        Pages: {
            /**
             * Navigate by specific page name
             */
            Navigate: 'NAVIGATE',
            /**
             * Navigate by url pathname (ex: /transactions)
             */
            NavigateByPathname: 'NAVIGATE_BY_PATHNAME'
        }
    },
    events: {
        Initialized: 'INITIALIZED',
        Widgets: {
            Replaced: 'WIDGETS:REPLACED',
            Set: 'WIDGETS:SET',
            Emitted: 'WIDGETS:EMITTED',
            Removed: 'WIDGETS:REMOVED',
        },
        Pages: {
            Navigated: 'NAVIGATED'
        }
    },
    queries: {
        InsertNewWidgetContexts: 'INSERT_NEW_WIDGET_CONTEXTS',
        RemoveWidgetContexts: 'REMOVE_WIDGET_CONTEXTS',

        DispatchToWidget: 'DISPATCH_TO_WIDGET',
        InitializeWidgets: 'INITIALIZE_WIDGETS',
        ReplacePageWidgetContexts: 'ADD_PAGE_WIDGET_CONTEXTS'
    },
    errors: {
        isAlreadyInitialized: 'You can only initialize state once',
        isAlreadyConnected: 'You can only emit CONNECTED once',
    }
}

const { coin } = config;
const initialState = {
    id: null as string,
    isInitialized: false,
    isConnected: false,
    widgetContexts: [] as WidgetContext[],
    /**
     * @todo note that coin is hardcoded in the carver user state (When you initialize carver user the coin is pre-selected until there is a coin selection.)
     */
    coin
}

export default {
    initialState,
    reducer,
    commonLanguage
}