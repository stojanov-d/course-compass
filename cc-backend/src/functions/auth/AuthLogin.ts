import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { DiscordAuthService } from '../../services/DiscordAuthService';

export async function AuthLogin(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Processing Discord OAuth2 login request');

  try {
    const discordService = new DiscordAuthService();

    const state = crypto.randomUUID();

    const authUrl = discordService.generateAuthUrl(state);

    return {
      status: 200,
      jsonBody: {
        authUrl,
        state,
      },
    };
  } catch (error: any) {
    console.error('Auth login error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
      },
    };
  }
}

app.http('AuthLogin', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: AuthLogin,
});
