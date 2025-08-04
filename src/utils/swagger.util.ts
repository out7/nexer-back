import type { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';

import { getSwaggerConfig } from '@/config/swagger.config';
import { apiReference } from '@scalar/nestjs-api-reference';

export function setupSwagger(app: INestApplication) {
  const config = getSwaggerConfig();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: '/docs/swagger.json',
    yamlDocumentUrl: '/docs/swagger.yaml',
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  app.use(
    '/scalar',
    apiReference({
      url: '/docs/swagger.json',
    }),
  );
}
