import { RESTDataSource, RequestOptions } from 'apollo-datasource-rest';
import IMenuItem from './IMenuItem';
import { BASE_URL } from '../constatns';
import { useSession } from '../../lib/auth/MsalAuth/client';

class MenuItem extends RESTDataSource {
  baseURL = BASE_URL;
  constructor(acessToken: string) {
    super();
    if (typeof acessToken === 'undefined') {
      throw new Error('Access token needs to be provided for the API calls');
    }
    this.context.token = acessToken;
  }
  static async build(): Promise<MenuItem> {
    const { getAccessToken } = useSession();
    const accessToken = await getAccessToken();
    return new MenuItem(accessToken);
  }

  async getMenuItems(): Promise<IMenuItem[]> {
    return this.get('/menuitems');
  }

  willSendRequest(request: RequestOptions): void {
    request.headers.set('Authorization', this.context.token);
  }
}

export default MenuItem;
