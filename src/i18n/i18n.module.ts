import { Module } from '@nestjs/common';
import {
  I18nModule,
  AcceptLanguageResolver,
  I18nJsonLoader,
  HeaderResolver,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'path';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(process.cwd(), 'src/i18n/translations/'),
        watch: true,
      },
      resolvers: [
        {
          use: AcceptLanguageResolver,
          options: ['en', 'vi', 'jp'],
        },
      ],
      loader: I18nJsonLoader,
    }),
  ],
  exports: [I18nModule],
})
export class CustomI18nModule {}
