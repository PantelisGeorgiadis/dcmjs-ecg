import { expectType, expectError } from 'tsd';
import { DicomEcg, log, version } from '.';

// log
expectType<void>(log.error('error'));

// version
expectType<string>(version);

// DicomEcg
expectError(new DicomEcg(1));
expectError(new DicomEcg('image'));

const ecg = new DicomEcg({}, '1.2.840.10008.1.2');
expectError(ecg.setTransferSyntaxUid(12345));
expectError(ecg.setElement(1, 2));
expectType<string>(ecg.getTransferSyntaxUid());

expectError(
  ecg.render({
    speed: '10',
    amplitude: '20',
    applyLowPassFilter: '1',
  })
);
expectType<{
  info: Array<{ key: string; value: unknown; unit?: string }>;
  svg: string;
}>(
  ecg.render({
    speed: 10,
    amplitude: 20,
    applyLowPassFilter: true,
  })
);
expectType<string>(ecg.toString());
