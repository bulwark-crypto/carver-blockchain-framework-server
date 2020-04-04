import { withContext } from '../../../../classes/logic/withContext';

import statsContext from '../../common/basicObject/context'
import { WidgetBindingParams } from '../../../app/carverUser/context'
import apiRestContext from '../../../app/api/rest/context'

const bindContexts = async ({ contextMap, id, userWidgetsContextStore, variantParams }: WidgetBindingParams) => {
    const { variant } = variantParams;

    const { registeredContext: widget } = await userWidgetsContextStore.register({
        id,
        context: statsContext,
        storeEvents: false,
        inMemory: true
    });

    const appContextStore = await contextMap.getContextStore({ id: 'APP' });
    const apiRest = await appContextStore.getLocal({ context: apiRestContext });

    apiRest.streamEvents({
        type: '*',
        callback: async ({ type, payload }) => {
            switch (type) {
                case apiRestContext.commonLanguage.events.ChannelReserved:
                    const { usersOnline } = await apiRest.query(apiRestContext.commonLanguage.storage.FindStats);

                    await widget.dispatch({
                        type: statsContext.commonLanguage.commands.Update,
                        payload: {
                            usersOnline
                        }
                    });
            }
        }
    });

    withContext(widget)
        .handleQuery(statsContext.commonLanguage.queries.FindInitialState, async () => {
            const { usersOnline } = await apiRest.query(apiRestContext.commonLanguage.storage.FindStats);

            return {
                usersOnline
            }
        })

    return widget;
}

export default {
    bindContexts
}