import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ProviderService } from './provider.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ProviderResponseDto } from './dto/response/provider.response.dto';
import { ProviderFilterDto } from './dto/provider.filter.dto';

@ApiTags('manufacturer')
@Controller('providers')
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Get()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное получение всех поставщиков ',
  })
  @ApiOperation({ summary: 'получение всех поставщиков' })
  @ApiQuery({ name: 'name', type: 'string', required: false })
  public async findAll(@Query() filterDto: ProviderFilterDto) {
    const providers = await this.providerService.findAll(filterDto);

    return plainToInstance(ProviderResponseDto, providers);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({
    name: 'id',
    type: String,
    required: true,
    description: 'Айди производителя',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное получение поставщика по айди',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поставщика с таким айди не был найден',
  })
  @ApiOperation({ summary: 'Получение поставщика по айди' })
  public async findById(@Param('id') id: string) {
    const provider = await this.providerService.findById(id);
    return plainToInstance(ProviderResponseDto, provider);
  }
}
