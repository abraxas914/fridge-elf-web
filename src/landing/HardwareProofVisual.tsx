import { useState } from 'react'
import { DeviceSyncSvg } from './illustrations/DeviceSyncSvg'
import { hardwareShowcase } from './hardwareShowcase'

const prototypeAlt =
  '同时运行 Fridge Elf 的手机端与冰箱硬件终端原型'

export function HardwareProofVisual() {
  const [photoState, setPhotoState] = useState<
    'loading' | 'ready' | 'failed'
  >('loading')

  return (
    <figure
      className="landing-hardware-proof"
      data-photo-ready={photoState === 'ready'}
      data-photo-failed={photoState === 'failed'}
      data-testid="hardware-proof"
    >
      <div className="landing-hardware-diagram">
        <DeviceSyncSvg />
      </div>
      <div className="landing-hardware-photo-frame">
        <img
          className="landing-hardware-photo"
          src={hardwareShowcase.images[0]}
          width="1434"
          height="1070"
          loading="lazy"
          decoding="async"
          alt={prototypeAlt}
          onLoad={() => setPhotoState('ready')}
          onError={() => setPhotoState('failed')}
        />
        <figcaption>
          手机端与冰箱终端，共享同一份正在流动的库存。
        </figcaption>
      </div>
    </figure>
  )
}
