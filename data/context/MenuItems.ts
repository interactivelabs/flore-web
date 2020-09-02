import {
  createContext,
  useReducer,
  createElement,
  ReactElement,
  useContext,
} from 'react';
import {
  MenuItemsState,
  MenuItemsAction,
  MENUITEMS_ACTIONS,
  MenuItemsProvider,
  UseMenuItemsProps,
  UseMenuItems,
} from './MenuItemsTypes';
import MenuItem from '../models/MenuItem';

const initialState: MenuItemsState = { loading: false };

const MenuItemsContext = createContext<Partial<MenuItemsState>>(initialState);

const menuItemsReducer = (
  state: MenuItemsState,
  action: MenuItemsAction,
): MenuItemsState => {
  switch (action.type) {
    case MENUITEMS_ACTIONS.LOADED_MENUITEMS: {
      return {
        ...state,
        menuItems: action.payload,
      };
    }
    default:
      return { ...state };
  }
};

export const Provider = ({ children }: MenuItemsProvider): ReactElement => {
  const [state, dispatch] = useReducer(menuItemsReducer, initialState);
  return createElement(
    MenuItemsContext.Provider,
    { value: { ...state, dispatch } },
    children,
  );
};

export const useMenuItems = ({ options }: UseMenuItemsProps): UseMenuItems => {
  const { loading, menuItems, dispatch } = useContext(MenuItemsContext);
  const getMenuItemModel = async () =>
    options?.token ? new MenuItem(options.token) : await MenuItem.build();
  let menuItemModel: MenuItem;
  const getMenuItems = async () => {
    menuItemModel = menuItemModel ? menuItemModel : await getMenuItemModel();
    const resp = await menuItemModel.getMenuItems();
    // console.log(resp);
    dispatch({ type: MENUITEMS_ACTIONS.LOADED_MENUITEMS, payload: resp });
    return resp;
  };
  return {
    loading,
    menuItems,
    getMenuItems,
  };
};
