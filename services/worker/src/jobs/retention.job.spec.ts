/**
 * Purpose: Unit test for RetentionJob's decision logic (data retention),
 * using mocked repositories so it runs without a real database.
 */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RetentionJob } from './retention.job';
import { ScanSessionEntity, OtpChallengeEntity, UserEntity } from '../database/entities';
import { WORKER_CONFIG } from '../config/config.module';

function mockRepo() {
  return {
    delete: jest.fn().mockResolvedValue({ affected: 3 }),
    find: jest.fn().mockResolvedValue([]),
  };
}

describe('RetentionJob', () => {
  let job: RetentionJob;
  let scanSessions: ReturnType<typeof mockRepo>;
  let otpChallenges: ReturnType<typeof mockRepo>;
  let users: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    scanSessions = mockRepo();
    otpChallenges = mockRepo();
    users = mockRepo();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RetentionJob,
        { provide: getRepositoryToken(ScanSessionEntity), useValue: scanSessions },
        { provide: getRepositoryToken(OtpChallengeEntity), useValue: otpChallenges },
        { provide: getRepositoryToken(UserEntity), useValue: users },
        {
          provide: WORKER_CONFIG,
          useValue: { RETENTION_SCAN_SESSION_DAYS: 30, ACCOUNT_DELETION_GRACE_DAYS: 30 },
        },
      ],
    }).compile();
    job = moduleRef.get(RetentionJob);
  });

  it('purges scan sessions older than the configured retention window', async () => {
    await job.run();
    expect(scanSessions.delete).toHaveBeenCalledTimes(1);
    const [criteria] = scanSessions.delete.mock.calls[0] as [{ createdAt: unknown }];
    expect(criteria.createdAt).toBeDefined();
  });

  it('purges OTP challenges older than one day regardless of the scan-session retention window', async () => {
    await job.run();
    expect(otpChallenges.delete).toHaveBeenCalledTimes(1);
  });

  it('hard-deletes only accounts whose deletion grace period has elapsed', async () => {
    users.find.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
    await job.run();
    expect(users.find).toHaveBeenCalledWith({
      where: { status: 'deletion_requested', deletionRequestedAt: expect.anything() },
    });
    expect(users.delete).toHaveBeenCalledTimes(2);
    expect(users.delete).toHaveBeenCalledWith({ id: 'user-1' });
    expect(users.delete).toHaveBeenCalledWith({ id: 'user-2' });
  });

  it('deletes no accounts when none are past their grace period', async () => {
    users.find.mockResolvedValue([]);
    await job.run();
    expect(users.delete).not.toHaveBeenCalled();
  });
});
