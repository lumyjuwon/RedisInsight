import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EncryptionService } from 'src/modules/encryption/encryption.service';
import { ModelEncryptor } from 'src/modules/encryption/model.encryptor';
import { RdiEntity } from 'src/modules/rdi/entities/rdi.entity';
import { Rdi } from 'src/modules/rdi/models';
import { RdiRepository } from 'src/modules/rdi/repository/rdi.repository';
import { classToClass } from 'src/utils';

@Injectable()
export class LocalRdiRepository extends RdiRepository {
  private readonly modelEncryptor: ModelEncryptor;

  constructor(
    @InjectRepository(RdiEntity)
    private readonly repository: Repository<RdiEntity>,
    private readonly encryptionService: EncryptionService,
  ) {
    super();
    this.modelEncryptor = new ModelEncryptor(this.encryptionService, ['password']);
  }

  /**
   * @inheritDoc
   */
  public async get(id: string, ignoreEncryptionErrors: boolean = false): Promise<Rdi> {
    const entity = await this.repository.findOneBy({ id });

    if (!entity) {
      return null;
    }

    return classToClass(Rdi, await this.modelEncryptor.decryptEntity(entity, ignoreEncryptionErrors));
  }

  /**
   * @inheritDoc
   */
  public async list(): Promise<Rdi[]> {
    // const entities = mockRdiInstances;

    const entities = await this.repository
      .createQueryBuilder('r')
      .select(['r.id', 'r.name', 'r.host', 'r.port', 'r.url', 'r.type', 'r.version', 'r.lastConnection'])
      .getMany();
    return entities.map((entity) => classToClass(Rdi, entity));
  }

  /**
   * @inheritDoc
   */
  public async create(rdi: Rdi): Promise<Rdi> {
    const entity = classToClass(RdiEntity, rdi);

    console.log(entity);

    return classToClass(
      Rdi,
      await this.modelEncryptor.decryptEntity(
        await this.repository.save(
          await this.modelEncryptor.encryptEntity(entity),
        ),
      ),
    );
    // mockRdiInstances.push(rdi);
    // return rdi;
  }

  /**
   * @inheritDoc
   */
  public async update(id: string, rdi: Partial<Rdi>): Promise<Rdi> {
    // todo: the same way as PATCH for databases
    return null;
  }

  /**
   * @inheritDoc
   */
  public async delete(ids: string[]): Promise<void> {
    await this.repository.delete(ids);
  }
}
