import { Module } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { HistoryModule } from '../history/history.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';

@Module({
  imports: [HistoryModule, MaintenanceModule],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
