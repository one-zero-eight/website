/**
 * Workshop API types
 */

export interface paths {
  "/users/register": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["users_register"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  // Новые эндпоинты сюда
}

export interface components {
  schemas: {
    RegisterRequest: {
      email: string;
      password: string;
    };
    RegisterResponse: {
      access_token: string;
    };
    // Новые реквесты и респонсы сюда
  };
}

export interface operations {
  users_register: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["RegisterRequest"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RegisterResponse"];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  // Новые операции сюда
}
